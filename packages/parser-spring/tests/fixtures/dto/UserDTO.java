package com.example;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;

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

@Data
class LombokUserDTO {
  private Long id;
  private String name;
}

@AllArgsConstructor
class LombokOrder {
  private String orderId;
  private int quantity;
}

class BaseEntityDTO {
  private String createdBy;
}

class AuditedDTO extends BaseEntityDTO {
  private String title;
}

class SelfRefDTO {
  private SelfRefDTO child;
  private String name;
}

class GenericDTO {
  private java.util.List<String> items;
  private java.util.Optional<AddressDTO> optionalAddress;
  private java.util.Map<String, Object> metadata;
}
