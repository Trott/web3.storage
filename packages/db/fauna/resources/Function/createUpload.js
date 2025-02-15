import fauna from 'faunadb'

const {
  Function,
  CreateFunction,
  Query,
  Lambda,
  Let,
  Match,
  Index,
  Select,
  Var,
  If,
  Create,
  Update,
  Exists,
  Now,
  Get,
  Ref,
  IsNonEmpty,
  Abort,
  Collection,
  IsNull,
  Not,
  Do,
  Call,
  Foreach,
  Add
} = fauna

const name = 'createUpload'
const body = Query(
  Lambda(
    ['data'],
    Let(
      {
        userRef: Ref(Collection('User'), Select('user', Var('data'))),
        authTokenRef: If(
          IsNull(Select('authToken', Var('data'), null)),
          null,
          Ref(Collection('AuthToken'), Select('authToken', Var('data')))
        )
      },
      If(
        Not(Exists(Var('userRef'))),
        Abort('user not found'),
        Let(
          {
            cid: Select('cid', Var('data')),
            contentMatch: Match(Index('unique_Content_cid'), Var('cid'))
          },
          If(
            IsNonEmpty(Var('contentMatch')),
            Let(
              {
                content: Get(Var('contentMatch')),
                uploadMatch: Match(
                  Index('upload_by_user_and_content'),
                  Var('userRef'),
                  Select('ref', Var('content')),
                  true
                )
              },
              If(
                IsNonEmpty(Var('uploadMatch')),
                Do(
                  Update(Var('userRef'), {
                    data: {
                      usedStorage: Add(
                        Select(['data', 'usedStorage'], Get(Var('userRef')), 0),
                        Select(['chunkSize'], Var('data'))
                      )
                    }
                  }),
                  Get(Var('uploadMatch'))
                ),
                Let(
                  {
                    upload: Create('Upload', {
                      data: {
                        user: Var('userRef'),
                        authToken: Var('authTokenRef'),
                        content: Select('ref', Var('content')),
                        name: Select('name', Var('data'), null),
                        type: Select('type', Var('data')),
                        created: Now()
                      }
                    })
                  },
                  Do(
                    Foreach(
                      Select('pins', Var('data')),
                      Lambda(
                        ['pin'],
                        Call('createOrUpdatePin', {
                          content: Select(['ref', 'id'], Var('content')),
                          status: Select('status', Var('pin')),
                          location: Select('location', Var('pin'))
                        })
                      )
                    ),
                    // Update user storage size
                    Update(Var('userRef'), {
                      data: {
                        usedStorage: Add(
                          Select(['data', 'usedStorage'], Get(Var('userRef')), 0),
                          Select(['chunkSize'], Var('data'))
                        )
                      }
                    }),
                    Var('upload')
                  )
                )
              )
            ),
            Let(
              {
                content: Create('Content', {
                  data: {
                    cid: Var('cid'),
                    dagSize: Select('dagSize', Var('data'), null),
                    created: Now()
                  }
                }),
                upload: Create('Upload', {
                  data: {
                    user: Var('userRef'),
                    authToken: Var('authTokenRef'),
                    content: Select('ref', Var('content')),
                    name: Select('name', Var('data'), null),
                    type: Select('type', Var('data')),
                    created: Now()
                  }
                }),
                pinRequest: Create('PinRequest', {
                  data: {
                    cid: Var('cid'),
                    content: Select('ref', Var('content')),
                    attempts: 0,
                    updated: Now(),
                    created: Now()
                  }
                })
              },
              Do(
                Foreach(
                  Select('pins', Var('data')),
                  Lambda(
                    ['pin'],
                    Call('createOrUpdatePin', {
                      content: Select(['ref', 'id'], Var('content')),
                      status: Select('status', Var('pin')),
                      location: Select('location', Var('pin'))
                    })
                  )
                ),
                // Update user storage size
                Update(Var('userRef'), {
                  data: {
                    usedStorage: Add(
                      Select(['data', 'usedStorage'], Get(Var('userRef')), 0),
                      Select(['chunkSize'], Var('data'))
                    )
                  }
                }),
                Var('upload')
              )
            )
          )
        )
      )
    )
  )
)

export default If(
  Exists(Function(name)),
  Update(Function(name), { name, body }),
  CreateFunction({ name, body })
)
