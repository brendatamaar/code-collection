package com.example;

import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {
  @GetMapping("/{id}")
  public UserDTO getUser(@PathVariable Long id) {
    return null;
  }

  @PostMapping
  public UserDTO createUser(@RequestBody CreateUserRequest body) {
    return null;
  }
}

class UserDTO {
  private Long id;
  private String name;
}

class CreateUserRequest {
  @NotBlank
  private String name;
  private String email;
}
