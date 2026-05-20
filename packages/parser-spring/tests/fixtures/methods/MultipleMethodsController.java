package com.example;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class MultipleMethodsController {
  @RequestMapping(
      value = {"/items", "/products"},
      method = {RequestMethod.GET, RequestMethod.POST})
  public UserDTO searchOrCreate() {
    return null;
  }
}
