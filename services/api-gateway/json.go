package main

import (
	"encoding/json"
	"net/http"

	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
)

func writeJSON(w http.ResponseWriter, status int, data any) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	return json.NewEncoder(w).Encode(data)
}

func writeProtoJSON(w http.ResponseWriter, status int, msg proto.Message) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	m := protojson.MarshalOptions{
		UseProtoNames:   false, // 👈 camelCase
		EmitUnpopulated: true,
	}

	b, err := m.Marshal(msg)
	if err != nil {
		return err
	}

	w.Write([]byte(`{"data":`))
	w.Write(b)
	w.Write([]byte(`}`))

	return nil
}
