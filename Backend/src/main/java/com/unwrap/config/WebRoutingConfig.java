package com.unwrap.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebRoutingConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(
                        "https://www.devtoolstack.in",
                        "https://devtoolstack.in",
                        "http://localhost:8080",
                        "http://127.0.0.1:8080"
                )
                .allowedMethods("POST", "OPTIONS")
                .allowedHeaders("*");

        registry.addMapping("/unwrapplsql/api/**")
                .allowedOrigins(
                        "https://www.devtoolstack.in",
                        "https://devtoolstack.in",
                        "http://localhost:8080",
                        "http://127.0.0.1:8080"
                )
                .allowedMethods("POST", "OPTIONS")
                .allowedHeaders("*");
    }

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addViewController("/unwrapplsql").setViewName("forward:/unwrapplsql/index.html");
        registry.addViewController("/unwrapplsql/").setViewName("forward:/unwrapplsql/index.html");
        registry.addViewController("/jsonformatter").setViewName("forward:/jsonformatter/index.html");
        registry.addViewController("/jsonformatter/").setViewName("forward:/jsonformatter/index.html");
        registry.addViewController("/textcompare").setViewName("forward:/textcompare/index.html");
        registry.addViewController("/textcompare/").setViewName("forward:/textcompare/index.html");
        registry.addViewController("/xml-formatter").setViewName("forward:/xml-formatter/index.html");
        registry.addViewController("/xml-formatter/").setViewName("forward:/xml-formatter/index.html");
    }
}
