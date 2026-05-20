package dev.codecollection.alpha;

import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {
  @GetMapping("/{id}")
  public UserResponse getUser(
    @PathVariable("id") Long id,
    @RequestParam(value = "includeInactive", required = false) Boolean includeInactive,
    @RequestHeader(value = "X-Request-Id", required = false) String requestId
  ) {
    return new UserResponse();
  }

  @PostMapping
  public UserResponse createUser(@RequestBody CreateUserRequest request) {
    return new UserResponse();
  }

  @PutMapping("/{id}")
  public UserResponse replaceUser(
    @PathVariable("id") Long id,
    @RequestBody UpdateUserRequest request
  ) {
    return new UserResponse();
  }

  @PatchMapping("/{id}")
  public UserResponse patchUser(
    @PathVariable("id") Long id,
    @RequestBody PatchUserRequest request
  ) {
    return new UserResponse();
  }

  @DeleteMapping("/{id}")
  public void deleteUser(@PathVariable("id") Long id) {
  }

  @GetMapping
  public List<UserResponse> listUsers(@RequestParam(value = "page", required = false) Integer page) {
    return List.of(new UserResponse());
  }
}

class CreateUserRequest {
  private String name;
  private String email;
  private int age;
  private boolean active;
}

class UpdateUserRequest {
  private String name;
  private String email;
  private int age;
  private boolean active;
}

class PatchUserRequest {
  private String name;
  private Boolean active;
}

class UserResponse {
  private Long id;
  private String name;
  private String email;
  private boolean active;
}
