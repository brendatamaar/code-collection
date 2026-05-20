export const GO_ROUTE_CALL_QUERY = `
(
  call_expression
  function: (selector_expression
    operand: (_) @route.receiver
    field: (field_identifier) @route.method)
  arguments: (argument_list
    (interpreted_string_literal) @route.path
    (_) @route.handler)
) @route.call
`;
