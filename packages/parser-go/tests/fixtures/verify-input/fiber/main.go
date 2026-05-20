package main

import "github.com/gofiber/fiber/v2"

func main() {
	app := fiber.New()
	app.Get("/products", listProducts)
	app.Post("/products", createProduct)
	app.Delete("/products/:id", deleteProduct)
	app.Listen(":8080")
}

func listProducts(c *fiber.Ctx) error  { return nil }
func createProduct(c *fiber.Ctx) error { return nil }
func deleteProduct(c *fiber.Ctx) error { return nil }
