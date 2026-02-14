import { gql } from 'apollo-angular';

const TYPE_FIELDS_FRAGMENT = `
  name
  kind
  fields {
    name
    description
    type {
      name
      kind
      ofType {
        name
        kind
        ofType {
          name
          kind
        }
      }
    }
  }
`;

export const INTROSPECT_TYPE_QUERY = gql`
  query IntrospectType($typeName: String!) {
    __type(name: $typeName) {
      name
      kind
      fields {
        name
        description
        type {
          ${TYPE_FIELDS_FRAGMENT}
          ofType {
            ${TYPE_FIELDS_FRAGMENT}
            ofType {
              name
              kind
            }
          }
        }
      }
      inputFields {
        name
        description
        type {
          name
          kind
          ofType {
            name
            kind
            ofType {
              name
              kind
              ofType {
                name
                kind
              }
            }
          }
        }
        defaultValue
      }
    }
  }
`;

export const INTROSPECT_SCHEMA_QUERY = gql`
  query IntrospectSchema {
    __schema {
      types {
        name
        kind
      }
      queryType {
        name
      }
      mutationType {
        name
      }
      subscriptionType {
        name
      }
    }
  }
`;
