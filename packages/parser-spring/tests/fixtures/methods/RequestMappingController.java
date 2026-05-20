package com.example;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RequestMappingController {
  @RequestMapping(value = "/search", method = RequestMethod.POST)
  public UserDTO search() {
    return null;
  }
}
