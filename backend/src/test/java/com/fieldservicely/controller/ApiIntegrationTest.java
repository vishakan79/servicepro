package com.fieldservicely.controller;

import com.fieldservicely.repository.UserRepository;
import com.fieldservicely.security.JwtService;
import com.jayway.jsonpath.JsonPath;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** End-to-end through the real filter chain, Flyway schema and seeded H2 database (dev profile). */
@SpringBootTest(properties = "app.seed.enabled=true")
@ActiveProfiles("dev")
@AutoConfigureMockMvc
class ApiIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired JwtService jwt;
    @Autowired UserRepository users;

    /** Tests mint the access token the server would issue after a successful sign-in. */
    private String login(String email) {
        return "Bearer " + jwt.createAccessToken(users.findByEmailIgnoreCase(email).orElseThrow());
    }

    private String admin() { return login("admin@fs.com"); }

    private String customer() { return login("customer@fs.com"); }

    private String technician() { return login("tech@fs.com"); }

    @Test
    void healthIsPublic() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }

    @Test
    void wrongPasswordIsRejectedWithAGenericMessage() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@fs.com\",\"password\":\"wrong-password-1\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"nobody@example.com\",\"password\":\"wrong-password-1\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void registrationNeedsBothFirebaseProofs() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"A\",\"email\":\"new@example.com\",\"phone\":\"+919876500001\",\"role\":\"CUSTOMER\","
                                + "\"address\":\"1 Main St\",\"password\":\"abcdefg1\",\"emailIdToken\":\"not.a.jwt\",\"phoneIdToken\":\"not.a.jwt\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void weakPasswordIsRejected() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"A\",\"email\":\"new@example.com\",\"phone\":\"+919876500001\",\"role\":\"CUSTOMER\","
                                + "\"address\":\"1 Main St\",\"password\":\"short\",\"emailIdToken\":\"x\",\"phoneIdToken\":\"x\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void adminAccountsCannotBeSelfRegistered() throws Exception {
        mvc.perform(post("/api/auth/register/start").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Evil\",\"email\":\"evil@example.com\",\"phone\":\"+919111111111\",\"role\":\"ADMIN\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void protectedEndpointsNeedAToken() throws Exception {
        mvc.perform(get("/api/work-orders")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/work-orders").header("Authorization", "Bearer not-a-jwt")).andExpect(status().isUnauthorized());
    }

    @Test
    void customersOnlySeeTheirOwnWorkOrders() throws Exception {
        mvc.perform(get("/api/work-orders?size=100").header("Authorization", customer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].customerName", everyItem(is("Ravi Kumar"))));
    }

    @Test
    void customerGetsNotFoundForSomeoneElsesWorkOrder() throws Exception {
        String adminToken = admin();
        MvcResult all = mvc.perform(get("/api/work-orders?size=100").header("Authorization", adminToken)).andExpect(status().isOk()).andReturn();
        List<Integer> others = JsonPath.read(all.getResponse().getContentAsString(), "$.content[?(@.customerName != 'Ravi Kumar')].id");
        mvc.perform(get("/api/work-orders/" + others.get(0)).header("Authorization", customer())).andExpect(status().isNotFound());
    }

    @Test
    void roleRestrictionsAreEnforced() throws Exception {
        mvc.perform(get("/api/customers").header("Authorization", technician())).andExpect(status().isForbidden());
        mvc.perform(get("/api/reports/summary").header("Authorization", customer())).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/users").header("Authorization", login("manager@fs.com"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/users").header("Authorization", admin())).andExpect(status().isOk());
        mvc.perform(post("/api/work-orders/1/assign").header("Authorization", technician()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"technicianId\":1,\"date\":\"2030-01-01\",\"startHour\":10,\"durationHours\":2}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void customerCreatesRequestAndDispatcherRunsItToInvoice() throws Exception {
        // 1. customer raises a request (always as themselves, even if they try to name another customer)
        MvcResult created = mvc.perform(post("/api/requests").header("Authorization", customer()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerId\":2,\"issueType\":\"Plumbing\",\"priority\":\"HIGH\",\"description\":\"Kitchen pipe burst\",\"imageCount\":0}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.customerName").value("Ravi Kumar"))
                .andExpect(jsonPath("$.status").value("NEW"))
                .andReturn();
        int woId = JsonPath.read(created.getResponse().getContentAsString(), "$.workOrderId");

        // 2. dispatcher cannot book a technician who is on leave
        String adminToken = admin();
        String date = LocalDate.now(ZoneOffset.UTC).plusDays(20).toString();
        mvc.perform(post("/api/work-orders/" + woId + "/assign").header("Authorization", adminToken).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"technicianId\":5,\"date\":\"" + date + "\",\"startHour\":9,\"durationHours\":2}"))
                .andExpect(status().isBadRequest());

        // 3. assigns Karthik, then a second order cannot take the same slot
        mvc.perform(post("/api/work-orders/" + woId + "/assign").header("Authorization", adminToken).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"technicianId\":1,\"date\":\"" + date + "\",\"startHour\":9,\"durationHours\":2}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.status").value("ASSIGNED"));
        MvcResult second = mvc.perform(post("/api/requests").header("Authorization", adminToken).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerId\":3,\"issueType\":\"Plumbing\",\"priority\":\"LOW\",\"description\":\"Dripping tap\",\"imageCount\":0}"))
                .andExpect(status().isCreated()).andReturn();
        int secondWo = JsonPath.read(second.getResponse().getContentAsString(), "$.workOrderId");
        mvc.perform(post("/api/work-orders/" + secondWo + "/assign").header("Authorization", adminToken).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"technicianId\":1,\"date\":\"" + date + "\",\"startHour\":10,\"durationHours\":2}"))
                .andExpect(status().isConflict());

        // 4. technician works the job; cannot skip steps or close it with an open checklist
        String tech = technician();
        mvc.perform(post("/api/work-orders/" + woId + "/status").header("Authorization", tech).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"COMPLETED\"}")).andExpect(status().isConflict());
        for (String s : List.of("EN_ROUTE", "IN_PROGRESS")) {
            mvc.perform(post("/api/work-orders/" + woId + "/status").header("Authorization", tech).contentType(MediaType.APPLICATION_JSON)
                            .content("{\"status\":\"" + s + "\"}")).andExpect(status().isOk());
        }
        mvc.perform(post("/api/work-orders/" + woId + "/status").header("Authorization", tech).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"COMPLETED\"}")).andExpect(status().isBadRequest());

        MvcResult detail = mvc.perform(get("/api/work-orders/" + woId).header("Authorization", tech)).andExpect(status().isOk()).andReturn();
        List<Integer> items = JsonPath.read(detail.getResponse().getContentAsString(), "$.checklist[*].id");
        for (int id : items) {
            mvc.perform(put("/api/work-orders/" + woId + "/checklist/" + id).header("Authorization", tech)
                    .contentType(MediaType.APPLICATION_JSON).content("{\"done\":true}")).andExpect(status().isOk());
        }

        // 5. parts: stock is consumed, and asking for more than exists is refused
        mvc.perform(post("/api/work-orders/" + woId + "/parts").header("Authorization", tech).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"partId\":7,\"quantity\":2}")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].quantity").value(2));
        mvc.perform(post("/api/work-orders/" + woId + "/parts").header("Authorization", tech).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"partId\":7,\"quantity\":9999}")).andExpect(status().isConflict());

        // 6. completing generates exactly one invoice for the customer
        mvc.perform(post("/api/work-orders/" + woId + "/status").header("Authorization", tech).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"COMPLETED\"}")).andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.status").value("COMPLETED"));
        mvc.perform(get("/api/invoices?size=100").header("Authorization", adminToken)).andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].workOrderId", hasItem(woId)));
        mvc.perform(get("/api/invoices?size=100").header("Authorization", technician())).andExpect(status().isForbidden());
    }

    @Test
    void feedbackOnlyAfterCompletionAndOnlyOnce() throws Exception {
        MvcResult all = mvc.perform(get("/api/work-orders?size=100").header("Authorization", customer())).andExpect(status().isOk()).andReturn();
        List<Integer> open = JsonPath.read(all.getResponse().getContentAsString(), "$.content[?(@.status != 'COMPLETED')].id");
        mvc.perform(post("/api/work-orders/" + open.get(0) + "/feedback").header("Authorization", customer())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"stars\":5,\"comment\":\"Great\"}"))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/work-orders/" + open.get(0) + "/feedback").header("Authorization", customer())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"stars\":9}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void dashboardAndReportsReturnNumbers() throws Exception {
        mvc.perform(get("/api/dashboard").header("Authorization", admin())).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRequests").isNumber())
                .andExpect(jsonPath("$.statusCounts.COMPLETED").isNumber());
        mvc.perform(get("/api/reports/summary").header("Authorization", admin())).andExpect(status().isOk())
                .andExpect(jsonPath("$.monthly.length()").value(6));
    }

    @Test
    void inventorySearchAndRestock() throws Exception {
        String adminToken = admin();
        mvc.perform(get("/api/parts?q=filter").header("Authorization", adminToken)).andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Air Filter"));
        mvc.perform(post("/api/parts/2/restock").header("Authorization", technician()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quantity\":5}")).andExpect(status().isForbidden());
        mvc.perform(post("/api/parts/2/restock").header("Authorization", adminToken).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quantity\":0}")).andExpect(status().isBadRequest());
    }
}
