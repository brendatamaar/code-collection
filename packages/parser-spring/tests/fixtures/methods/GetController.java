package com.example;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class GetController {
  @GetMapping("/{id}")
  public UserDTO getUser(@PathVariable Long id) {
    return null;
  }
}
