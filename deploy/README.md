##Deployment Scripts
The Orange backend has an accompanying deployment script to get an instance running located in this directory.  The system uses Ansible to automate deployment.  To learn more about Ansible, visit [docs.ansible.com](http://docs.ansible.com/).

Additionally, this deployment script is designed to work with a Vagrant instance.  Vagrant automates the creation of virtual machines on local computers.  For more information on Vagrant, visit [www.vagrantup.com](https://www.vagrantup.com/).

Note:  These scripts are designed to work with Red Hat Enterprise Linux 7.0 (or equivalent CentOS).

###Vagrant Instructions

Navigate to /vagrant folder of this directory, and type:

```
vagrant up
```

Vagrant will automatically execute the Ansible script and deploy the instance locally.

You can access the box via ssh by typing: 

```
vagrant ssh
```

The API will then be running on port 80 of the Vagrant box, which will be mapped to port 8080 locally. Documentation will then be accessible at `http://localhost:8080/docs/`, and the API itself at `http://localhost:8080/api/v1/`.

###Server Instructions

To deploy to a server aside from a Vagrant VM, you will need to configure that server to allow you to access it from your computer.

To get a webserver running, you typically need to specify a hosts file, a private key, and the script.  There is a hosts file which can be amended in the `ansible/hosts` directory with your servers.  It is usually required to specify a private key as well.  The below command, when run from the `ansible` directory, will work.

```
ansible-playbook playbook.yml -i "hosts/hosts.ini" --private-key="your_key.pem"
```

The server should be running CentOS 7 and have port 80 open to the public. Documentation will then be accessible at `http://SERVER/docs/`, and the API itself at `http://SERVER/api/v1/`.

The playbook `update.yml` can be used to deploy new code changes without having to wipe the server.
