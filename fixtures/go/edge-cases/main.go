package main

import (
	"net/http"

	"github.com/gorilla/mux"
)

// Edge cases exercised:
//   - gorilla/mux with nested sub-routers via PathPrefix + Subrouter
//   - Middleware applied to sub-routers (simulated via HandleFunc)
//   - Deep path nesting: /api/v1/users/{userID}/posts
//   - Multiple HTTP methods on the same path prefix

func main() {
	r := mux.NewRouter()

	v1 := r.PathPrefix("/api/v1").Subrouter()

	users := v1.PathPrefix("/users").Subrouter()
	users.HandleFunc("", listUsers).Methods("GET")
	users.HandleFunc("", createUser).Methods("POST")
	users.HandleFunc("/{userID}", getUser).Methods("GET")
	users.HandleFunc("/{userID}", updateUser).Methods("PUT")
	users.HandleFunc("/{userID}", deleteUser).Methods("DELETE")
	users.HandleFunc("/{userID}/posts", listUserPosts).Methods("GET")
	users.HandleFunc("/{userID}/posts", createUserPost).Methods("POST")

	admin := v1.PathPrefix("/admin").Subrouter()
	admin.HandleFunc("/stats", getStats).Methods("GET")
	admin.HandleFunc("/cache", clearCache).Methods("DELETE")

	http.ListenAndServe(":8080", r)
}

func listUsers(w http.ResponseWriter, r *http.Request)        {}
func createUser(w http.ResponseWriter, r *http.Request)       {}
func getUser(w http.ResponseWriter, r *http.Request)          {}
func updateUser(w http.ResponseWriter, r *http.Request)       {}
func deleteUser(w http.ResponseWriter, r *http.Request)       {}
func listUserPosts(w http.ResponseWriter, r *http.Request)    {}
func createUserPost(w http.ResponseWriter, r *http.Request)   {}
func getStats(w http.ResponseWriter, r *http.Request)         {}
func clearCache(w http.ResponseWriter, r *http.Request)       {}
