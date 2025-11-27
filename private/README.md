# private part:

## login:
```javascript
[
   {
        "name": <userName>,
        "pass": <sha512>,
        "status": "admin",
        "error": 0,
    },
    {
        "name": <userName>,
        "pass": <sha512>,
        "status": "editor",
        "error": 0,
    },
    {
        "name": <userName>,
        "pass": <sha512>,
        "status": "juge",
        "error": 0
    }
]
```

## users:
```javascript
[
    {
        "name": <User name>,
        "group": "competitor",
        "categorie": "U9", // U9, U11, U13, U16, U17, U19, senior, veteran
        "genre": "M", // M, F
        "club": <Club name>
    }
]
```

## voie:
```javascript
[
    {
        "name": <Track Name>,
        "type": "bloc", // bloc, diff, vitesse 
        "comments": "",
        "score": ""
    }
]
```

## score:
```javascript
{
    <User name>: {
        <Track Name>: [ ],
    }
}
```