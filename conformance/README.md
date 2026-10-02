# Conformance suite

Language-neutral test cases for any implementation of the `.bjj` notation. They use the base
vocabulary ([`../vocabulary/base.json`](../vocabulary/base.json)).

- `valid/NAME.bjj` must read without error. `valid/NAME.json` gives the expected result:
  `graph` (name, nodes, edges), `warnings` (code, line, column) and `gaps` (node keys).
- `invalid/NAME.bjj` must be refused. `invalid/NAME.json` gives the expected error: code, line and
  column of the first mistake.

Messages are not compared: they depend on the language. Lines and columns start at 1; columns count
UTF-16 code units.

Node keys are the declared alias, or the identifier followed by its side when it has one
(`side_control.top`). Optional fields are omitted when absent (`side`, `detail`, `when`,
`leadsToFinish`).
