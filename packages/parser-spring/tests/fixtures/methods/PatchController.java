package com.example;

import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PatchController {
  @PatchMapping("/{id}")
  public UserDTO patchUser(@PathVariable Long id, @RequestBody UserDTO body) {
    return null;
  }
}
