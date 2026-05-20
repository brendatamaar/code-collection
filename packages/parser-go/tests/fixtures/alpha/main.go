package main

import "github.com/gin-gonic/gin"

func main() {
	r := gin.Default()

	v1 := r.Group("/v1")
	v1.GET("/users", AuthRequired(listUsers))
	v1.POST("/users", AuthRequired(createUser))
	v1.GET("/users/:id", AuthRequired(getUser))

	r.GET("/health", healthCheck)
	r.Run(":8080")
}

func listUsers(c *gin.Context)  {}
func createUser(c *gin.Context) {}
func getUser(c *gin.Context)    {}
func healthCheck(c *gin.Context) {}
