export const LARAVEL_ROUTE_CALL_QUERY = `
(
  scoped_call_expression
  scope: (name) @route.scope
  name: (name) @route.method
  arguments: (arguments) @route.arguments
) @route.call
`;

export const LARAVEL_CONTROLLER_QUERY = `
(
  class_declaration
  name: (name) @controller.name
) @controller.class

(
  method_declaration
  name: (name) @controller.method.name
) @controller.method
`;
