package com.fieldservicely;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class FieldServicelyApplication {
    public static void main(String[] args) {
        SpringApplication.run(FieldServicelyApplication.class, args);
    }
}
