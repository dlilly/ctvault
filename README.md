# ctvault
## Motivation
ctvault is a wrapper library around the commercetools JavaScript SDK that aims to reduce boilerplate code and provide consolidated credential management for multiple commercetools projects.

## Configuration
There are multiple methods for configuring the type of data store that ctvault uses.  Set the `CT_VAULT_CONFIG` environment variable to point to the location of the JSON configuration file.

### commercetools project

This configuration will point ctvault at a commercetools project, specifying a namespace and key for a custom object to store the managed credentials.

| key           | value                                 |
| ------------- | ------------------------------------- |
| `type`        | `"ctp"`                               |
| `namespace`   | the custom object namespace           |
| `key`         | the custom object key                 |
| `credentials` | the commercetools project credentials |

### Google Firebase

You can also use a Google Firebase store to serve as the credentials vault.

| key           | value                                                                                                                 |
| ------------- | --------------------------------------------------------------------------------------------------------------------- |
| `type`        | `"firebase"`                                                                                                          |
| `credentials` | path to a JSON file with GCP service account credentials (see https://cloud.google.com/iam/docs/service-accounts)     |
| `collection`  | name of the firebase collection that holds the managed credentials                                                    |

### Local file

Alternatively you can store them in a file on the local file system.

| key           | value                                         |
| ------------- | --------------------------------------------- |
| `type`        | `"file"`                                      |
| `credentials` | an array of commercetools project credentials |

### commercetools Credentials

Here is the structure for the commercetools credentials objects.  These are both to specify the project (if you are pointing at a commercetools project) and to specify the set of managed credentials.

| key             | value                                   |
| --------------- | --------------------------------------- |
| `oauth_url`     | URL to the commercetools auth server    |
| `api_url`       | URL to the commercetools API gateway    |
| `project`       | project key                             |
| `client_id`     | API client ID                           |
| `client_secret` | API client secret                       |

## Usage

ctvault acts as a simple broker.  You can query it by using two methods:

### `getClient(projectKey)`

This will return a CTP client configured to talk to the project specified in `projectKey` if the credentials exist in the vault.  If they are not, an exception is thrown to that effect.

If `projectKey` is empty, ctvault will attempt to find it in the command line argument `--project`.

### `getClients`

This will return an array of CTP clients for which the vault contains credentials.

Both of these methods are asynchronous, so be sure to use `await`.

## Using a ctvault CTP client (ctclient)

ctclient uses a syntax based on `api-request-builder` (https://commercetools.github.io/nodejs/sdk/api/apiRequestBuilder.html), specifically the Declarative Usage section (https://commercetools.github.io/nodejs/sdk/api/apiRequestBuilder.html#declarative-usage).

Largely syntactic sugar, it provides an interface for you to use standard CRUD operations (`create`, `get`, `update`, `remove`), but also adds the following verbs:

`process`: This will use the `processRequest` method from `api-request-builder` to page through objects.

`ensure`: Given a source object, will try to find an object with the matching `key`.  If it is not found, it will be created with the source object as the template.  Use when building data models.

### Examples

Query for a tax category with a key of `standard`:

```
const argv = require('yargs').argv
let ct = await require('ctvault').getClient(argv.project)

let standardTaxCategory = await ct.taxCategories.get({ key: 'standard' })
```

Make sure order type `foo` is defined:

```
const argv = require('yargs').argv
let ct = await require('ctvault').getClient(argv.project)

let fooOrderType = {
    key: 'FooOrderType',
    name: { 
        en: 'Foo'
    },
    resourceTypeIds: ['order'],
    description: { 
        en: 'Foo'
    },
    fieldDefinitions: [{
        name: 'bar',
        type: { name: 'String' },
        required: false,
        label: { 
            en: 'Bar'
        }
    }]
}

let foo = await ct.types.ensure(fooOrderType)
```