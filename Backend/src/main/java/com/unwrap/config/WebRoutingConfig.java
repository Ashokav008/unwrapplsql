package com.unwrap.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebRoutingConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addViewController("/unwrapplsql").setViewName("forward:/unwrapplsql/index.html");
        registry.addViewController("/unwrapplsql/").setViewName("forward:/unwrapplsql/index.html");
        registry.addViewController("/jsonformatter").setViewName("forward:/jsonformatter/index.html");
        registry.addViewController("/jsonformatter/").setViewName("forward:/jsonformatter/index.html");
    }
}
