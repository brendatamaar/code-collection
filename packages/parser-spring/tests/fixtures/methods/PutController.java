package com.example;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PutController {
  @PutMapping("/{id}")
  public UserDTO replaceUser(@PathVariable Long id, @RequestBody UserDTO body) {
    return null;
  }
}
