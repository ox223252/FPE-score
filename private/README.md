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
        "categorie": "U8", // U8, U10, U12, U14, U16, U18, senior, veteran
        "genre": "M", // M, F
        "club": <Club name>
    }
]
```

## voie:
```javascript
{
    <Track Name>: {
        "voie": <Track Name>,
        "type": "bloc", // bloc, diff, vitesse 
        "comments": "",
        "score": ""
    }
}
```

## score:
```javascript
{
    <User name>: {
        <Track Name>: [ ],
    }
}
```