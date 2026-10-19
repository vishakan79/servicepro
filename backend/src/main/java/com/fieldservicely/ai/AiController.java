package com.fieldservicely.ai;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import com.fieldservicely.security.CurrentUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    public record AiRequest(@NotNull AiTask task, @NotBlank @Size(max = 9000) String input) {}

    public record AiResponse(String text) {}

    public record AiStatus(boolean enabled) {}

    private final AiService ai;

    public AiController(AiService ai) {
        this.ai = ai;
    }

    @GetMapping("/status")
    public AiStatus status() {
        return new AiStatus(ai.enabled());
    }

    @PostMapping("/run")
    public AiResponse run(@Valid @RequestBody AiRequest body) {
        return new AiResponse(ai.run(String.valueOf(CurrentUser.require().id()), body.task(), body.input()));
    }
}
