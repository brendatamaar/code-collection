package main

import "github.com/labstack/echo/v4"

func main() {
	e := echo.New()
	g := e.Group("/v1")
	g.GET("/items", listItems)
	g.POST("/items", createItem)
	g.PUT("/items/:id", updateItem)
	e.Start(":8080")
}

func listItems(c echo.Context) error  { return nil }
func createItem(c echo.Context) error { return nil }
func updateItem(c echo.Context) error { return nil }
