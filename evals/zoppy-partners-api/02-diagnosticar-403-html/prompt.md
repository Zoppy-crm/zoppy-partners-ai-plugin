---
description: "diagnosticar 403 com página HTML"
tags: [zoppy-partners-api]
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

Minha integração com a Partners API da Zoppy começou a falhar. Toda chamada responde 403 e o corpo é um HTML com "Just a moment...". Meu código manda `Authorization: Bearer <token>` e `Content-Type: application/json`. O que está errado e como corrijo?
