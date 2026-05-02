package com.unwrap.util;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.zip.DataFormatException;
import java.util.zip.Inflater;

public class OracleUnwrapUtil {

    // Oracle 10g/11g substitution table
    private static final int[] SUB_TABLE = {
            0x3d, 0x65, 0x85, 0xb3, 0x18, 0xdb, 0xe2, 0x87, 0xf1, 0x52, 0xab, 0x63,
            0x4b, 0xb5, 0xa0, 0x5f, 0x7d, 0x68, 0x7b, 0x9b, 0x24, 0xc2, 0x28, 0x67,
            0x8a, 0xde, 0xa4, 0x26, 0x1e, 0x03, 0xeb, 0x17, 0x6f, 0x34, 0x3e, 0x7a,
            0x3f, 0xd2, 0xa9, 0x6a, 0x0f, 0xe9, 0x35, 0x56, 0x1f, 0xb1, 0x4d, 0x10,
            0x78, 0xd9, 0x75, 0xf6, 0xbc, 0x41, 0x04, 0x81, 0x61, 0x06, 0xf9, 0xad,
            0xd6, 0xd5, 0x29, 0x7e, 0x86, 0x9e, 0x79, 0xe5, 0x05, 0xba, 0x84, 0xcc,
            0x6e, 0x27, 0x8e, 0xb0, 0x5d, 0xa8, 0xf3, 0x9f, 0xd0, 0xa2, 0x71, 0xb8,
            0x58, 0xdd, 0x2c, 0x38, 0x99, 0x4c, 0x48, 0x07, 0x55, 0xe4, 0x53, 0x8c,
            0x46, 0xb6, 0x2d, 0xa5, 0xaf, 0x32, 0x22, 0x40, 0xdc, 0x50, 0xc3, 0xa1,
            0x25, 0x8b, 0x9c, 0x16, 0x60, 0x5c, 0xcf, 0xfd, 0x0c, 0x98, 0x1c, 0xd4,
            0x37, 0x6d, 0x3c, 0x3a, 0x30, 0xe8, 0x6c, 0x31, 0x47, 0xf5, 0x33, 0xda,
            0x43, 0xc8, 0xe3, 0x5e, 0x19, 0x94, 0xec, 0xe6, 0xa3, 0x95, 0x14, 0xe0,
            0x9d, 0x64, 0xfa, 0x59, 0x15, 0xc5, 0x2f, 0xca, 0xbb, 0x0b, 0xdf, 0xf2,
            0x97, 0xbf, 0x0a, 0x76, 0xb4, 0x49, 0x44, 0x5a, 0x1d, 0xf0, 0x00, 0x96,
            0x21, 0x80, 0x7f, 0x1a, 0x82, 0x39, 0x4f, 0xc1, 0xa7, 0xd7, 0x0d, 0xd1,
            0xd8, 0xff, 0x13, 0x93, 0x70, 0xee, 0x5b, 0xef, 0xbe, 0x09, 0xb9, 0x77,
            0x72, 0xe7, 0xb2, 0x54, 0xb7, 0x2a, 0xc7, 0x73, 0x90, 0x66, 0x20, 0x0e,
            0x51, 0xed, 0xf8, 0x7c, 0x8f, 0x2e, 0xf4, 0x12, 0xc6, 0x2b, 0x83, 0xcd,
            0xac, 0xcb, 0x3b, 0xc4, 0x4e, 0xc0, 0x69, 0x36, 0x62, 0x02, 0xae, 0x88,
            0xfc, 0xaa, 0x42, 0x08, 0xa6, 0x45, 0x57, 0xd3, 0x9a, 0xbd, 0xe1, 0x23,
            0x8d, 0x92, 0x4a, 0x11, 0x89, 0x74, 0x6b, 0x91, 0xfb, 0xfe, 0xc9, 0x01,
            0xea, 0x1b, 0xf7, 0xce
    };

    public static String unwrap(String wrappedText) throws Exception {
        // Split on lines containing only '/'
        String[] sections = wrappedText.split("(?m)^\\s*/\\s*$");
        StringBuilder result = new StringBuilder();

        for (int idx = 0; idx < sections.length; idx++) {
            String section = sections[idx].trim();
            if (section.isEmpty()) continue;
            if (!section.toLowerCase().contains("wrapped")) continue;

            String base64 = extractBase64(section);
            if (base64.isEmpty()) continue;

            // Pad Base64
            while (base64.length() % 4 != 0) base64 += "=";

            byte[] decoded = Base64.getDecoder().decode(base64);
            byte[] substituted = substitute(decoded);

            String decompressed = decompressWithScanning(substituted);
            if (decompressed != null && !decompressed.isEmpty()) {
                result.append("/* ===== Unwrapped Section ").append(idx + 1).append(" ===== */\n");
                result.append(decompressed).append("\n\n");
            }
        }

        if (result.length() == 0) {
            throw new Exception("No valid wrapped sections found");
        }
        return result.toString().trim();
    }

    /**
     * Extract the Base64 body exactly as unwrap.py does:
     * Skip lines until we see a long line of only Base64 characters.
     */
    private static String extractBase64(String section) {
        StringBuilder sb = new StringBuilder();
        boolean inBody = false;
        String[] lines = section.split("\\n");

        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) continue;
            if (trimmed.equals("/")) break;

            if (!inBody) {
                // A line that is pure Base64 and long enough indicates start of body
                if (trimmed.matches("^[A-Za-z0-9+/=]+$") && trimmed.length() >= 30) {
                    inBody = true;
                    sb.append(trimmed);
                }
            } else {
                sb.append(trimmed.replaceAll("\\s", ""));
            }
        }
        return sb.toString().replaceAll("[^A-Za-z0-9+/=]", "");
    }

    private static byte[] substitute(byte[] input) {
        byte[] output = new byte[input.length];
        for (int i = 0; i < input.length; i++) {
            int val = input[i] & 0xFF;
            output[i] = (byte) SUB_TABLE[val];
        }
        return output;
    }

    /**
     * Try to decompress from standard offset 20 (SHA-1 hash).
     * If that fails, scan for a raw deflate stream.
     */
    private static String decompressWithScanning(byte[] data) {
        // First try the known offset: 20 bytes for SHA-1 hash
        if (data.length > 20) {
            try {
                byte[] compressed = new byte[data.length - 20];
                System.arraycopy(data, 20, compressed, 0, compressed.length);
                return decompress(compressed, false);
            } catch (Exception ignored) {
                try {
                    byte[] compressed = new byte[data.length - 20];
                    System.arraycopy(data, 20, compressed, 0, compressed.length);
                    return decompress(compressed, true);
                } catch (Exception ignoredRaw) {
                    // Continue to scanning
                }
            }
        }

        // Scan from offset 0 up to 100 (in case hash length differs)
        for (int offset = 0; offset < Math.min(100, data.length - 10); offset++) {
            try {
                byte[] compressed = new byte[data.length - offset];
                System.arraycopy(data, offset, compressed, 0, compressed.length);
                String result = decompress(compressed, false);
                // Check if result contains PL/SQL keywords
                if (result != null && (result.contains("CREATE") || result.contains("PACKAGE")
                        || result.contains("PROCEDURE") || result.contains("FUNCTION"))) {
                    return result;
                }
            } catch (Exception ignored) {
                try {
                    byte[] compressed = new byte[data.length - offset];
                    System.arraycopy(data, offset, compressed, 0, compressed.length);
                    String result = decompress(compressed, true);
                    if (result != null && (result.contains("CREATE") || result.contains("PACKAGE")
                            || result.contains("PROCEDURE") || result.contains("FUNCTION"))) {
                        return result;
                    }
                } catch (Exception ignoredRaw) {
                    // Try next offset
                }
            }
        }
        return null;
    }

    private static String decompress(byte[] compressed, boolean raw) throws DataFormatException {
        Inflater inflater = new Inflater(raw);
        inflater.setInput(compressed);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];

        while (!inflater.finished()) {
            int count = inflater.inflate(buffer);
            if (count == 0) {
                if (inflater.needsInput()) break;
                if (inflater.needsDictionary()) throw new DataFormatException("Inflater requires a dictionary");
                throw new DataFormatException("Inflater made no progress");
            }
            baos.write(buffer, 0, count);
        }
        inflater.end();

        if (baos.size() == 0) {
            throw new DataFormatException("No data decompressed");
        }

        return baos.toString(StandardCharsets.UTF_8);
    }
}
