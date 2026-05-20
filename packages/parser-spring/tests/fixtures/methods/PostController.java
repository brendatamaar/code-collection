package com.example;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PostController {
  @PostMapping
  public UserDTO createUser(@RequestBody CreateUserRequest body) {
    return null;
  }
}
