export const CONTROLLER_CLASS_QUERY = `
(class_declaration
  (modifiers
    [(marker_annotation
        name: (identifier) @anno_name
        (#match? @anno_name "^(RestController|Controller)$"))
     (annotation
        name: (identifier) @anno_name
        (#match? @anno_name "^(RestController|Controller)$"))])
  name: (identifier) @class_name) @class
`;

export const CLASS_REQUEST_MAPPING_QUERY = `
(class_declaration
  (modifiers
    (annotation
      name: (identifier) @anno
      (#eq? @anno "RequestMapping")
      arguments: (annotation_argument_list) @args)))
`;

export const METHOD_MAPPING_QUERY = `
(method_declaration
  (modifiers
    [(marker_annotation
        name: (identifier) @anno
        (#match? @anno "^(GetMapping|PostMapping|PutMapping|PatchMapping|DeleteMapping|RequestMapping)$"))
     (annotation
        name: (identifier) @anno
        (#match? @anno "^(GetMapping|PostMapping|PutMapping|PatchMapping|DeleteMapping|RequestMapping)$")
        arguments: (annotation_argument_list)? @args)])
  type: (_) @return_type
  name: (identifier) @method_name
  parameters: (formal_parameters) @params) @method
`;

export const METHOD_PARAMETER_QUERY = `
(formal_parameter
  (modifiers
    [(marker_annotation
        name: (identifier) @anno
        (#match? @anno "^(PathVariable|RequestParam|RequestHeader|CookieValue|RequestBody|ModelAttribute)$"))
     (annotation
        name: (identifier) @anno
        (#match? @anno "^(PathVariable|RequestParam|RequestHeader|CookieValue|RequestBody|ModelAttribute)$")
        arguments: (annotation_argument_list)? @anno_args)])
  type: (_) @param_type
  name: (identifier) @param_name)
`;

export const AUTH_ANNOTATION_QUERY = `
(annotation
  name: (identifier) @anno
  (#match? @anno "^(PreAuthorize|PostAuthorize|Secured|RolesAllowed)$")
  arguments: (annotation_argument_list) @args)
`;

export const SPRING_QUERIES = {
  CONTROLLER_CLASS_QUERY,
  CLASS_REQUEST_MAPPING_QUERY,
  METHOD_MAPPING_QUERY,
  METHOD_PARAMETER_QUERY,
  AUTH_ANNOTATION_QUERY
} as const;
