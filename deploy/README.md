There are two options for deployment: a traditional deployment with Ansible (and vagrant for testing
locally), and using docker containers. To deploy traditionally, see the `traditional` directory
and the documentation within.

To deploy using docker, just configure config.js in your local directory and then use `docker-compose` to
deploy this. For example, to deploy a test instance to docker locally, one would run:

    docker-compose up

and then to redeploy

    docker-compose build
    docker-compose up

All required data is persistent across docker containers (a data-only container is used to mount a persistent
volume), so instances can be redeployed at will.
