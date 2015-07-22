FROM        centos:centos6
MAINTAINER  Harry Rickards <rickards@mit.edu>

# Enable EPEL and nginx
RUN yum -y update; yum clean all
RUN yum -y install epel-release; yum clean all
RUN yum -y install nginx; yum clean all

# Copy over configuration files
COPY deploy/nginx/nginx.conf /etc/nginx/nginx.conf
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy over documentation
RUN mkdir -p /var/www/orange/docs
COPY docs/output /var/www/orange/docs

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
