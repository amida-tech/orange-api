FROM        centos:centos6
MAINTAINER  Harry Rickards <rickards@mit.edu>

# based on balsamiq/docker-kibana

# install required utilities
RUN yum -y update; yum clean all
RUN yum -y install tar wget; yum clean all

# download and extra Kibana
WORKDIR /opt
RUN wget --no-check-certificate -O- https://download.elasticsearch.org/kibana/kibana/kibana-4.0.1-linux-x64.tar.gz | tar xvfz -
WORKDIR /opt/kibana-4.0.1-linux-x64
RUN mkdir /etc/kibana # This is where the htpasswd file is placed by the run script

# copy config
COPY kibana.yml config/

EXPOSE 5601
CMD ["bin/kibana"]
