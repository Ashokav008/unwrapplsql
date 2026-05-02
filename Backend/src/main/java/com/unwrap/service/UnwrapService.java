package com.unwrap.service;
import com.unwrap.util.OracleUnwrapUtil;
import org.springframework.stereotype.Service;

@Service
public class UnwrapService {
    public String unwrap(String input) throws Exception {
        return OracleUnwrapUtil.unwrap(input);
    }
}