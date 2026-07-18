package br.com.minhalista;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class MinhaListaApplication {

    public static void main(String[] args) {
        SpringApplication.run(MinhaListaApplication.class, args);
    }
}
