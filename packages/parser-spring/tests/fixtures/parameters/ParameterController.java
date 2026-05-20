package com.example;

import java.util.List;
import java.util.Optional;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ParameterController {
  @GetMapping("/all/{id}")
  public UserDTO allKinds(
    @PathVariable Long id,
    @RequestParam String q,
    @RequestHeader("X-Request-ID") String requestId,
    @CookieValue("session") String session
  ) {
    return null;
  }

  @GetMapping("/body")
  public UserDTO withBody(@RequestBody UserDTO body) {
    return null;
  }

  @GetMapping("/optional")
  public UserDTO optionalQuery(
    @RequestParam Optional<Integer> limit,
    @RequestParam(required = false) Integer offset
  ) {
    return null;
  }

  @GetMapping("/complex")
  public UserDTO complexTypes(
    @RequestParam List<Long> ids,
    @RequestParam String[] names,
    @RequestParam UserFilter filter
  ) {
    return null;
  }
}
