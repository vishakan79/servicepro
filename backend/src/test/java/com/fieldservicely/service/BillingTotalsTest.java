package com.fieldservicely.service;

import com.fieldservicely.entity.InvoiceLine;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class BillingTotalsTest {

    @Test
    void addsEighteenPercentGstAndRoundsToTwoDecimals() {
        List<InvoiceLine> lines = List.of(
                new InvoiceLine(1L, "Visit", 1, new BigDecimal("500.00")),
                new InvoiceLine(1L, "Labour", 1, new BigDecimal("1500.00")),
                new InvoiceLine(1L, "Washing Machine Motor", 1, new BigDecimal("4200.00")));
        BigDecimal[] t = BillingService.totals(lines);
        assertThat(t[0]).isEqualByComparingTo("6200.00");
        assertThat(t[1]).isEqualByComparingTo("1116.00");
        assertThat(t[2]).isEqualByComparingTo("7316.00");
    }

    @Test
    void multipliesQuantityByUnitPrice() {
        BigDecimal[] t = BillingService.totals(List.of(new InvoiceLine(1L, "Filter", 3, new BigDecimal("450.00"))));
        assertThat(t[0]).isEqualByComparingTo("1350.00");
    }

    @Test
    void emptyInvoiceIsZero() {
        BigDecimal[] t = BillingService.totals(List.of());
        assertThat(t[2]).isEqualByComparingTo("0.00");
    }

    @Test
    void roundsHalfUp() {
        BigDecimal[] t = BillingService.totals(List.of(new InvoiceLine(1L, "Odd", 1, new BigDecimal("0.25"))));
        assertThat(t[1]).isEqualByComparingTo("0.05"); // 0.045 -> 0.05
    }
}
