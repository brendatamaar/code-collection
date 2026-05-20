package com.example.api;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class WithParameters {
  @PostMapping("/search")
  @PreAuthorize("hasRole('ADMIN')")
  public SearchResponse search(
    @RequestParam String q,
    @RequestHeader("X-Request-ID") String requestId,
    @CookieValue("session") String session,
    @RequestBody SearchRequest body
  ) {
    return null;
  }
}
