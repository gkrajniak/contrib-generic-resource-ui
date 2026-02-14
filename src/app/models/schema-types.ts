export interface IntrospectionType {
  name: string;
  kind: TypeKind;
  fields?: IntrospectionField[];
  inputFields?: IntrospectionInputValue[];
  ofType?: IntrospectionType;
}

export interface IntrospectionField {
  name: string;
  type: IntrospectionType;
  args?: IntrospectionInputValue[];
  description?: string;
}

export interface IntrospectionInputValue {
  name: string;
  type: IntrospectionType;
  defaultValue?: string;
  description?: string;
}

export type TypeKind =
  | 'SCALAR'
  | 'OBJECT'
  | 'INTERFACE'
  | 'UNION'
  | 'ENUM'
  | 'INPUT_OBJECT'
  | 'LIST'
  | 'NON_NULL';

export interface IntrospectionResult {
  __type: IntrospectionType | null;
}

export interface SchemaField {
  name: string;
  typeName: string;
  kind: TypeKind;
  isNonNull: boolean;
  isList: boolean;
  isScalar: boolean;
  description?: string;
  underlyingType?: IntrospectionType;
}
