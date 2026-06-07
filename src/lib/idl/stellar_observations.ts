/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/stellar_observations.json`.
 */
export type StellarObservations = {
  "address": "t17oa4uuLXhSDZh2WSgYA4vDzUx3iCDDRnJ2iY5AywT",
  "metadata": {
    "name": "stellarObservations",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Proof-of-Observation registry for Stellar — on-chain attestations of verified astronomical observations"
  },
  "docs": [
    "Stellar Proof-of-Observation registry.",
    "",
    "Records verified astronomical observations as on-chain attestations. Writes",
    "are signed by a server-held `oracle_authority` — the same trust model as",
    "Stellar's off-chain HMAC verification token and server-side Stars mint: only",
    "the server (which runs Claude Vision + Open-Meteo + EXIF/dedup checks) can",
    "attest an observation's confidence. Users never sign; the write is gasless."
  ],
  "instructions": [
    {
      "name": "initializeRegistry",
      "docs": [
        "One-time setup. The signer becomes `admin`; `oracle_authority` is the",
        "key allowed to record observations."
      ],
      "discriminator": [
        189,
        181,
        20,
        17,
        174,
        57,
        249,
        59
      ],
      "accounts": [
        {
          "name": "registry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "oracleAuthority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "recordObservation",
      "docs": [
        "Record a verified observation. The `Observation` PDA is seeded by the",
        "photo's file hash, so re-recording the same photo fails the `init`",
        "(on-chain dedup). `init_if_needed` upserts the observer's profile."
      ],
      "discriminator": [
        37,
        148,
        41,
        216,
        83,
        104,
        162,
        96
      ],
      "accounts": [
        {
          "name": "registry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "observation",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  98,
                  115
                ]
              },
              {
                "kind": "arg",
                "path": "args.file_hash"
              }
            ]
          }
        },
        {
          "name": "observerProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  98,
                  115,
                  101,
                  114,
                  118,
                  101,
                  114
                ]
              },
              {
                "kind": "arg",
                "path": "args.observer"
              }
            ]
          }
        },
        {
          "name": "oracleAuthority",
          "writable": true,
          "signer": true,
          "relations": [
            "registry"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "recordObservationArgs"
            }
          }
        }
      ]
    },
    {
      "name": "revokeObservation",
      "docs": [
        "Anti-fraud clawback: mark an observation revoked and roll back the",
        "observer's counters. Oracle/admin only."
      ],
      "discriminator": [
        134,
        66,
        65,
        59,
        156,
        73,
        222,
        210
      ],
      "accounts": [
        {
          "name": "registry",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "observation",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  98,
                  115
                ]
              },
              {
                "kind": "arg",
                "path": "fileHash"
              }
            ]
          }
        },
        {
          "name": "observerProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  98,
                  115,
                  101,
                  114,
                  118,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "observation.observer",
                "account": "observation"
              }
            ]
          }
        },
        {
          "name": "oracleAuthority",
          "signer": true,
          "relations": [
            "registry"
          ]
        }
      ],
      "args": [
        {
          "name": "fileHash",
          "type": {
            "array": [
              "u8",
              20
            ]
          }
        }
      ]
    },
    {
      "name": "setOracleAuthority",
      "discriminator": [
        39,
        155,
        66,
        106,
        213,
        226,
        114,
        174
      ],
      "accounts": [
        {
          "name": "registry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "registry"
          ]
        }
      ],
      "args": [
        {
          "name": "newAuthority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "setPaused",
      "discriminator": [
        91,
        60,
        125,
        192,
        176,
        225,
        166,
        218
      ],
      "accounts": [
        {
          "name": "registry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "registry"
          ]
        }
      ],
      "args": [
        {
          "name": "paused",
          "type": "bool"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "observation",
      "discriminator": [
        109,
        190,
        190,
        95,
        28,
        172,
        243,
        74
      ]
    },
    {
      "name": "observerProfile",
      "discriminator": [
        111,
        110,
        252,
        106,
        206,
        16,
        218,
        149
      ]
    },
    {
      "name": "registry",
      "discriminator": [
        47,
        174,
        110,
        246,
        184,
        182,
        252,
        218
      ]
    }
  ],
  "events": [
    {
      "name": "observationRecorded",
      "discriminator": [
        233,
        242,
        174,
        139,
        15,
        36,
        175,
        196
      ]
    },
    {
      "name": "observationRevoked",
      "discriminator": [
        240,
        1,
        254,
        144,
        63,
        197,
        232,
        149
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "Signer is not authorized for this action"
    },
    {
      "code": 6001,
      "name": "registryPaused",
      "msg": "Registry is paused"
    },
    {
      "code": 6002,
      "name": "invalidConfidence",
      "msg": "Confidence must be 0..=3"
    },
    {
      "code": 6003,
      "name": "invalidTarget",
      "msg": "Target code must be 0..=5"
    },
    {
      "code": 6004,
      "name": "alreadyRevoked",
      "msg": "Observation already revoked"
    }
  ],
  "types": [
    {
      "name": "observation",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "observer",
            "type": "pubkey"
          },
          {
            "name": "targetCode",
            "type": "u8"
          },
          {
            "name": "identifiedHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "confidence",
            "type": "u8"
          },
          {
            "name": "latMicro",
            "type": "i32"
          },
          {
            "name": "lonMicro",
            "type": "i32"
          },
          {
            "name": "observedAt",
            "type": "i64"
          },
          {
            "name": "oracleHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "cloudCover",
            "type": "u8"
          },
          {
            "name": "starsAwarded",
            "type": "u32"
          },
          {
            "name": "fileHash",
            "type": {
              "array": [
                "u8",
                20
              ]
            }
          },
          {
            "name": "revoked",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "observationRecorded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "observer",
            "type": "pubkey"
          },
          {
            "name": "fileHash",
            "type": {
              "array": [
                "u8",
                20
              ]
            }
          },
          {
            "name": "targetCode",
            "type": "u8"
          },
          {
            "name": "confidence",
            "type": "u8"
          },
          {
            "name": "starsAwarded",
            "type": "u32"
          },
          {
            "name": "observedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "observationRevoked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "observer",
            "type": "pubkey"
          },
          {
            "name": "fileHash",
            "type": {
              "array": [
                "u8",
                20
              ]
            }
          }
        ]
      }
    },
    {
      "name": "observerProfile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "observer",
            "type": "pubkey"
          },
          {
            "name": "totalObservations",
            "type": "u64"
          },
          {
            "name": "totalStars",
            "type": "u64"
          },
          {
            "name": "firstSeen",
            "type": "i64"
          },
          {
            "name": "lastSeen",
            "type": "i64"
          },
          {
            "name": "revokedCount",
            "type": "u32"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "recordObservationArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "observer",
            "type": "pubkey"
          },
          {
            "name": "fileHash",
            "docs": [
              "First 20 bytes of the sha256 image hash (matches the off-chain `0x…` id)."
            ],
            "type": {
              "array": [
                "u8",
                20
              ]
            }
          },
          {
            "name": "targetCode",
            "docs": [
              "0 moon · 1 planet · 2 stars · 3 constellation · 4 deep_sky · 5 unknown."
            ],
            "type": "u8"
          },
          {
            "name": "identifiedHash",
            "docs": [
              "sha256 of the identified object string."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "confidence",
            "docs": [
              "0 rejected · 1 low · 2 medium · 3 high."
            ],
            "type": "u8"
          },
          {
            "name": "latMicro",
            "type": "i32"
          },
          {
            "name": "lonMicro",
            "type": "i32"
          },
          {
            "name": "observedAt",
            "type": "i64"
          },
          {
            "name": "oracleHash",
            "docs": [
              "Weather-oracle hash (Open-Meteo cloud-cover attestation)."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "cloudCover",
            "type": "u8"
          },
          {
            "name": "starsAwarded",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "registry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "oracleAuthority",
            "type": "pubkey"
          },
          {
            "name": "totalObservations",
            "type": "u64"
          },
          {
            "name": "paused",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
