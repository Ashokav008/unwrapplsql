package com.unwrap.controller;
import com.unwrap.service.UnwrapService;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class UnwrapController {

    private final UnwrapService service;

    public UnwrapController(UnwrapService service) {
        this.service = service;
    }

    @PostMapping("/unwrap")
    public Map<String, Object> unwrap(@RequestBody Map<String, String> req) {
        try {
            String result = service.unwrap(req.get("input"));
            return Map.of("success", true, "data", result);
        } catch (Exception e) {
            return Map.of("success", false, "error", e.getMessage());
        }
    }
}
