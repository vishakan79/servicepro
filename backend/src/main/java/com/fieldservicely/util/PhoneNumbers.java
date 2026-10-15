package com.fieldservicely.util;

import com.fieldservicely.exception.ApiException;
import java.util.regex.Pattern;

/** Phone numbers are stored and compared in E.164 (+<country code><number>), the format Firebase reports. */
public final class PhoneNumbers {
    private PhoneNumbers() {}

    private static final Pattern E164 = Pattern.compile("^\\+[1-9][0-9]{7,14}$");

    public static String normalize(String raw) {
        String s = raw == null ? "" : raw.replaceAll("[\\s().-]", "");
        if (!E164.matcher(s).matches()) {
            throw new ApiException.BadRequest("Enter the mobile number with country code, e.g. +919876543210");
        }
        return s;
    }
}
