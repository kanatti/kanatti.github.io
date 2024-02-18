---
title: "Redstone Dev-Log #1"
description: "Updates on Redstone Project - A Java Language Server implemented in Rust. Covers initial project setup, code generation and ungrammar."
previewImage: "/previews/redstone-devlog-1.png"
publishDate: "16 Feb 2024"
tags: ["language-server", "redstone", "rust", "java"]
draft: false
---

Redstone is a new learning project I started about a week back. Goal is to implement a language server for Java in Rust and a vscode extension along with it. I will be writing regular dev-logs about the progress on the project, this being the first one.

## Why Redstone?

Because I am both curious and bored. I plan to deep dive and learn about a bunch of things through this project:
1. Internals of `rust-analyzer`, as a reference implementation of language server in `Rust`.
2. Internals of `eclipse.jdt.ls`, as a reference implementation of language server for `Java`.
3. On parsers, abstract-syntax-trees, concrete-syntax-grees, grammars and all sorts of fun things related to building a semantic model out of raw source code.
4. Error resilient parsing and full-fidelity syntax trees which mainly show up in code editors.
5. Some serious hands on with Rust - especially writing large projects, performance and memory optimizations, common patterns.
6. Deeper understanding of Language Server Protocol.
7. On writing a VSCode extension.
8. Semantic Analysis of `Java`

I would be really happy if I can get through all of the above even if the project doesn’t end up as production ready.


Alright, so let’s look at what progress has been made till now.

## Basics of LSP


Language Server Protocol (LSP) standardises how editors talk to a language-server.

It uses `JSONRPC` protocol. We will cover more of LSP in a later post, though some very basic concepts to get us started with are:

1. There are three types of messages - Request, Response, Notification.
2. Request and Response are tied with an Id
3. Notification is more like an event, does not have a response.
4. Requests support cancellation, through $/cancelRequest notification.
5. There is a handshake process during the initialization, both client and server share the capabilities they support.

Read More:
https://microsoft.github.io/language-server-protocol/overviews/lsp/overview/


## VSCode Extension

### Progress made till now
1. Boilerplate setup
2. Extension starts a new language-client + language-server
3. Language client sends requests to the language-server for editor events.

https://github.com/redstone-org/redstone-code

### On boilerplate and Language Client

VSCode provides some tooling to generate the extension boilerplate - https://code.visualstudio.com/api/get-started/your-first-extension.

The role extension here is to act as a language-client which will send requests to the language-server based on different editor events. We can use the LanguageClient implementation from vscode-languageclient/node package.

```ts
let client = new LanguageClient(
		"redstone",
		"Redstone Java Language Server",
		serverOptions,
		clientOptions
);
```

### On Server Options

We can pass in an `Executable { command }` to the Language Client to start the language-server. Client will run this command in a separate process and communicate with it through `stdio`.

In our case the command will be a path to `redstone-language-server` binary.  For now I hard code the path to Cargo build target for the language server, but later on we can bundle the binary along with the extension.

### What does the Language Client do?

Language Client will send requests like `textDocument/DidOpen` or `textDocument/DidChange` to the language-server. These requests are only sent if the same is supported by the server which is synced through serverCapabilities during the initial handshake process.

## Redstone Language Server

### Progress made till now
1. A simple language server that accents events and logs the requests
2. Some boilerplate for Abstract Syntax Tree (AST) and Concrete Syntax Tree (CST)
3. Code generation for SyntaxKind
4. Java UnGrammar based on Oracle Java Language Spec
5. Partial Code generation of AstNodes


### Language Server and Event Loop

- lsp-types crate provides all the types for language server protocol
- rust-analyzer has published the language server implementation in lsp-server crate.

Using both these crates makes our life easier to implement the language server pretty quick.

We initialize stdio connection first, then do the handshake. And start an EventLoop.

Event loop use CrossBeam Channel and select! To receive a message and handle it. Exit Notification will exit the event loop and the language server.

### Abstract Syntax Tree and Concrete Syntax Tree

This is a complicated topic, I will cover this in depth in a future post.

For starters:
Unlike Compilers, Editors and Language Server requires full-fidelity ASTs and error resilient parsing.
One approach to this is use a untyped Concrete Syntax Tree and layer AST as view on top of it.
Rowan crate by rust-analyzer lets you do the same. It provides an efficient CST implementation.

More details - 

### Java UnGrammar and Code Generation

UnGrammar from rust-analyzer lets you write your AST representation in an EBNF like format and then provides you programmatic access to it.

This is useful for code generation of AST abstractions.

For example:


```
ImportDeclaration =
  SingleTypeImportDeclaration
| TypeImportOnDemandDeclaration
| SingleStaticImportDeclaration
| StaticImportOnDemandDeclaration

SingleTypeImportDeclaration =
  'import' TypeName ';'

TypeImportOnDemandDeclaration =
  'import' PackageOrTypeName '.' '*' ';'

SingleStaticImportDeclaration =
  'import' 'static' TypeName '.' Identifier ';'

StaticImportOnDemandDeclaration =
  'import' 'static' TypeName '.' '*' ';'
```



In Ungrammar you get a node ImportDeclaration with a rule alt

```json
  "ImportDeclaration": {
    "alt": [
      {
        "node": "SingleTypeImportDeclaration"
      },
      {
        "node": "TypeImportOnDemandDeclaration"
      },
      {
        "node": "SingleStaticImportDeclaration"
      },
      {
        "node": "StaticImportOnDemandDeclaration"
      }
    ]
  }
```

Which can be use to generate a rust Enum to represent ImportDeclaration AstNode:

```rs
pub enum ImportDeclaration {
	SingleTypeImportDeclaration(SingleTypeImportDeclaration).
	TypeImportOnDemandDeclaration(TypeImportOnDemandDeclaration),
	SingleStaticImportDeclaration(SingleStaticImportDeclaration),
	StaticImportOnDemandDeclaration(StaticImportOnDemandDeclaration),
}
```


Java UnGrammar is added here - https://github.com/redstone-org/redstone/blob/main/crates/syntax/java.ungram

## What’s next?
