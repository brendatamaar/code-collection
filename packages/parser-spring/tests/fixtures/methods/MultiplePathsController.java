package com.example;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MultiplePathsController {
  @GetMapping({"/users", "/people"})
  public UserDTO list() {
    return null;
  }
}
