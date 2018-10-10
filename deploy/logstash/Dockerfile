FROM        centos:centos6
MAINTAINER  Harry Rickards <rickards@mit.edu>

# Add elasticsearch yum repo
RUN  rpm --import http://packages.elasticsearch.org/GPG-KEY-elasticsearch
COPY elasticsearch.repo /etc/yum.repos.d/

# Enable EPEL, git, Node.js/npm
RUN yum -y update; yum clean all
RUN yum -y install java-1.7.0-openjdk; yum clean all
RUN yum -y install logstash; yum clean all

# copy config
COPY conf.d /etc/logstash/conf.d

WORKDIR /opt/logstash

EXPOSE 9998
ENV JAVA_HOME /usr/lib/jvm/jre-1.7.0-openjdk.x86_64/
CMD ["bin/logstash", "agent", "-f", "/etc/logstash/conf.d/"]
