package dev.codecollection.edge;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

/**
 * Exercises:
 *   - Regex path constraints ({id:[0-9]+})
 *   - @PreAuthorize on controller and method level
 *   - Optional @RequestParam with enum-style values
 */
@RestController
@RequestMapping("/api/v1/items")
@PreAuthorize("isAuthenticated()")
public class RegexController {

  @GetMapping("/{id:[0-9]+}")
  public ItemResponse getItem(@PathVariable Long id) {
    return new ItemResponse();
  }

  @GetMapping("/{id:[0-9]+}/audit")
  @PreAuthorize("hasRole('ADMIN')")
  public AuditResponse getAudit(
    @PathVariable Long id,
    @RequestParam(value = "since", required = false) String since
  ) {
    return new AuditResponse();
  }

  @GetMapping("/search")
  public java.util.List<ItemResponse> searchItems(
    @RequestParam(value = "q", required = true) String query,
    @RequestParam(value = "status", required = false) String status,
    @RequestParam(value = "page", required = false) Integer page,
    @RequestParam(value = "size", required = false) Integer size
  ) {
    return java.util.List.of();
  }
}

class ItemResponse {
  private Long id;
  private String name;
  private String status;
}

class AuditResponse {
  private Long itemId;
  private String action;
  private String performedBy;
  private String timestamp;
}
