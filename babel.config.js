module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Replace import.meta.env with process.env to fix
      // "Cannot use import.meta outside a module" on web.
      // Zustand and other deps use import.meta.env for env checks.
      [
        function importMetaEnvPlugin() {
          return {
            visitor: {
              MetaProperty(path) {
                // Transform: import.meta.env?.MODE → process.env.NODE_ENV
                // Transform: import.meta.env → process.env
                const { node, parent } = path;
                if (
                  node.meta.name === 'import' &&
                  node.property.name === 'meta'
                ) {
                  // import.meta.env → process.env
                  if (
                    parent.type === 'MemberExpression' &&
                    parent.property.name === 'env'
                  ) {
                    path.replaceWith(
                      path.scope.buildUndefinedNode()
                    );
                    // Replace the entire import.meta.env with { MODE: process.env.NODE_ENV }
                    const memberPath = path.parentPath;
                    memberPath.replaceWith(
                      memberPath.scope.addHelper
                        ? path.scope.buildUndefinedNode()
                        : {
                            type: 'ObjectExpression',
                            properties: [
                              {
                                type: 'ObjectProperty',
                                key: { type: 'Identifier', name: 'MODE' },
                                value: {
                                  type: 'MemberExpression',
                                  object: {
                                    type: 'MemberExpression',
                                    object: { type: 'Identifier', name: 'process' },
                                    property: { type: 'Identifier', name: 'env' },
                                    computed: false,
                                  },
                                  property: { type: 'Identifier', name: 'NODE_ENV' },
                                  computed: false,
                                },
                                computed: false,
                                shorthand: false,
                              },
                            ],
                          }
                    );
                    return;
                  }
                  // Fallback: import.meta → { env: { MODE: process.env.NODE_ENV } }
                  path.replaceWith({
                    type: 'ObjectExpression',
                    properties: [],
                  });
                }
              },
            },
          };
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
