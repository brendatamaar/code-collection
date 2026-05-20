package com.example;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DeleteController {
  @DeleteMapping("/{id}")
  public void deleteUser(@PathVariable Long id) {
  }
}
