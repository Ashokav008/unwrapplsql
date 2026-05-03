package com.unwrap.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class CanonicalDomainFilter extends OncePerRequestFilter {

    private static final String CANONICAL_HOST = "www.devtoolstack.in";
    private static final String ROOT_HOST = "devtoolstack.in";
    private static final String RENDER_HOST_SUFFIX = ".onrender.com";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String host = request.getHeader("X-Forwarded-Host");
        if (host == null || host.isBlank()) {
            host = request.getHeader("Host");
        }

        if (host != null && !isLocalHost(host)) {
            String hostname = host.split(":")[0].toLowerCase();
            if (hostname.endsWith(RENDER_HOST_SUFFIX) || hostname.equals(ROOT_HOST)) {
                String requestUri = request.getRequestURI();
                String targetPath = requestUri.equals("/") ? "/unwrapplsql/" : requestUri;
                String target = "https://" + CANONICAL_HOST + targetPath;
                String query = request.getQueryString();
                if (query != null && !query.isBlank()) {
                    target += "?" + query;
                }
                response.setStatus(HttpServletResponse.SC_MOVED_PERMANENTLY);
                response.setHeader("Location", target);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean isLocalHost(String host) {
        String hostname = host.split(":")[0].toLowerCase();
        return hostname.equals("localhost") || hostname.equals("127.0.0.1") || hostname.equals("[::1]");
    }
}
