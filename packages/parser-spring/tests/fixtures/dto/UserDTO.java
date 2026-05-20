package com.example;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public class PrimitiveDTO {
  private Long id;
  private String name;
  private boolean active;
  private Double score;
}

class ValidatedDTO {
  @NotNull
  private String name;

  @NotBlank
  private String email;

  @NotEmpty
  private String description;
}

class UserWithAddressDTO {
  private Long id;
  private AddressDTO address;
}

class AddressDTO {
  private String street;
}
