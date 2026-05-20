package main

import "github.com/gin-gonic/gin"

func main() {
	r := gin.Default()
	v1 := r.Group("/v1")
	v1.GET("/users", listUsers)
	v1.POST("/users", createUser)
	v1.GET("/users/:id", getUser)
	v1.DELETE("/users/:id", deleteUser)
	r.Run(":8080")
}

func listUsers(c *gin.Context)  {}
func createUser(c *gin.Context) {}
func getUser(c *gin.Context)    {}
func deleteUser(c *gin.Context) {}
