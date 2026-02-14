import { gql } from 'apollo-angular';

export const INTROSPECT_TYPE_QUERY = gql`
  query IntrospectType($typeName: String!) {
    __type(name: $typeName) {
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
              ofType {
                name
                kind
              }
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
