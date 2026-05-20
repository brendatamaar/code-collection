package com.example;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class BodyController {
  @PostMapping("/users")
  public UserDTO create(@RequestBody CreateUserRequest body) {
    return null;
  }

  @PostMapping(value = "/upload", consumes = "text/plain")
  public UserDTO upload(@RequestBody String body) {
    return null;
  }

  @PostMapping("/optional")
  public UserDTO optionalBody(@RequestBody(required = false) CreateUserRequest body) {
    return null;
  }

  @DeleteMapping("/users/{id}")
  public void delete() {
  }

  @GetMapping("/entity")
  public ResponseEntity<UserDTO> getEntity() {
    return null;
  }

  @GetMapping("/users")
  public List<UserDTO> list() {
    return null;
  }

  @GetMapping("/array")
  public UserDTO[] array() {
    return null;
  }
}
