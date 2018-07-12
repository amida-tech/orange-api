# Group Authentication
Orange API uses access token authentication, like many REST services and similar
to (and in fact a semi-compatible subset of) OAuth2. First you use stored
user credentials to generate an access token with an identity provider,
and then pass this access token into the `Authorization` header of all other
requests. All requests apart from user registration and token generation
need this authentication.

Precisely, the access token should be sent in the `Authorization` header in the
form

```http
Authorization: Bearer ACCESS_TOKEN
```

and should be sent in plaintext, _not_ base64 encoded.
